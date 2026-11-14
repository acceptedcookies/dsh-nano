/** Baked /nano-local-sandbox rows. sessionBinding is true on every row. */
export const ROUTE_TABLE = [
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/status",
    "methods": [
      "GET",
      "HEAD"
    ],
    "sensitivity": "L0",
    "capability": "read:host",
    "bodyLimit": 0,
    "sessionBinding": true,
    "justification": "status"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/open",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "net:sandbox",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "open"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/shot",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "shot"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/history",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "history"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/pick",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "pick"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/edit",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "write:engine",
    "bodyLimit": 8192,
    "sessionBinding": true,
    "justification": "edit"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/settings",
    "methods": [
      "POST"
    ],
    "sensitivity": "L1",
    "capability": "write:sandbox",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "settings"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/perf-review/host",
    "methods": [
      "GET",
      "HEAD",
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 0,
    "sessionBinding": true,
    "justification": "perf-review/host"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/perf-report",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 200000,
    "sessionBinding": true,
    "justification": "perf-report"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/kite",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "proc:local-sandbox",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "kite"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/console",
    "methods": [
      "GET",
      "HEAD",
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "console"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/operations",
    "methods": [
      "GET",
      "HEAD",
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "operations"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/diagnostics",
    "methods": [
      "GET",
      "HEAD"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 0,
    "sessionBinding": true,
    "justification": "diagnostics"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/ports",
    "methods": [
      "GET",
      "HEAD"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 0,
    "sessionBinding": true,
    "justification": "ports"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/recover",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "proc:local-sandbox",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "recover"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/dom",
    "methods": [
      "GET",
      "HEAD"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 0,
    "sessionBinding": true,
    "justification": "dom"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/selftest",
    "methods": [
      "GET",
      "HEAD",
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 0,
    "sessionBinding": true,
    "justification": "selftest"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/elements",
    "methods": [
      "GET",
      "HEAD"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 0,
    "sessionBinding": true,
    "justification": "elements"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/browse-history",
    "methods": [
      "GET",
      "HEAD",
      "POST",
      "DELETE"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "browse-history"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/network",
    "methods": [
      "GET",
      "HEAD",
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "network"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/targets",
    "methods": [
      "GET",
      "HEAD"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 0,
    "sessionBinding": true,
    "justification": "targets"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/evaluate",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "write:engine",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "evaluate"
  },
  {
    "plugin": "dsh-nano-local-sandbox",
    "path": "/nano-local-sandbox/wait",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:engine",
    "bodyLimit": 4096,
    "sessionBinding": true,
    "justification": "wait"
  }
]
