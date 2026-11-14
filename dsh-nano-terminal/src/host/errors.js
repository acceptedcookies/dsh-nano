// Stable error kinds for the dnt contract surface.
// One enum consumed by: ws error frames, MCP tool errors, /term slash output,
// and the client's status mapping. Kinds only grow — never rename or remove
// (schema/dnt-mcp.openrpc.json is the canonical list; keep in sync).

export const KIND = Object.freeze({
  NOT_FOUND: 'not_found', // no such session/address/name
  BLOCKED: 'blocked', // target reported blocked; send refused (use force)
  FINISHED: 'finished', // terminal exited; operation needs a live one
  LIVE: 'live', // operation requires a finished/inactive terminal
  UNAVAILABLE: 'unavailable', // transiently not usable (recovering/attaching)
  SPAWN_FAILED: 'spawn_failed', // backend refused to start the program
  CONFLICT: 'conflict', // request contradicts current state
  STATUS_MISMATCH: 'status_mismatch', // --if condition not met
  NAME_TAKEN: 'name_taken', // requested name already bound
  NEEDS_TARGET: 'needs_target', // ambiguous/unspecified target
  INCOMPATIBLE: 'incompatible', // protocol/version/capability mismatch
  LIMIT: 'limit', // resource cap reached (session count, body size)
  INVALID: 'invalid', // malformed argument
})

/** Build an Error carrying a stable kind. */
export function err(kind, message, extra) {
  const e = new Error(message)
  e.kind = kind
  if (extra) Object.assign(e, extra)
  return e
}

/** kind of an unknown throwable (default 'invalid'). */
export function kindOf(e) {
  return KIND[e?.kind?.toUpperCase?.()] ?? e?.kind ?? KIND.INVALID
}
