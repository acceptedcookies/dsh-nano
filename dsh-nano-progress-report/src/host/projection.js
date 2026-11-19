import { bashFingerprint, digest, isDigest, successfulBash } from '../shared/fingerprint.js'

const MAX_PENDING = 64
const MAX_FACTS = 8
const MAX_PATH_BYTES = 192
const FILE_TOOLS = new Set(['write', 'edit', 'apply_patch'])
const isId = value => typeof value === 'string' && value.length > 0 && value.length <= 256
const isPath = value => typeof value === 'string' && value.length > 0 && Buffer.byteLength(value) <= MAX_PATH_BYTES
const isCount = value => Number.isSafeInteger(value) && value >= 0
const isList = (value, max, valid) => Array.isArray(value) && value.length <= max && value.every(valid)

function parseState(value) {
  if (!value || typeof value !== 'object'
    || !isCount(value.inherited) || !isDigest(value.cwd)
    || !isList(value.paths, MAX_FACTS, isPath)
    || !isList(value.failures, MAX_FACTS, isDigest)
    || !isList(value.pending, MAX_PENDING, item => item && isId(item.id)
      && (FILE_TOOLS.has(item.kind) || (item.kind === 'bash' && isDigest(item.key))))) {
    throw new Error('Invalid progress projection checkpoint')
  }
  // Rebuild the allowlisted fields; a checkpoint cannot introduce extra payloads.
  return {
    inherited: value.inherited, cwd: value.cwd, paths: [...value.paths], failures: [...value.failures],
    pending: value.pending.map(({ id, kind, key }) => kind === 'bash' ? { id, kind, key } : { id, kind }),
  }
}

const insertRecent = (list, item, limit) => [item, ...list.filter(value => value !== item)].slice(0, limit)

const bashKey = bashFingerprint

function apply(state, event) {
  // This is the host-supplied prefix cut, not the firstLiveSeq on reopen.
  if (event.seq < state.inherited) return state
  const data = event.data
  switch (event.type) {
    case 'working-directory/change': {
      if (typeof data.cwd !== 'string') return state
      const cwd = digest(data.cwd)
      return cwd === state.cwd ? state : { ...state, cwd }
    }
    case 'turn/start':
      return state.pending.length ? { ...state, pending: [] } : state
    case 'tool/call': {
      if (!isId(data.callId)) return state
      const kind = data.name
      let entry
      if (FILE_TOOLS.has(kind)) entry = { id: data.callId, kind }
      else if (kind === 'bash') {
        const key = bashKey(data.arguments, state.cwd)
        if (key) entry = { id: data.callId, kind, key }
      }
      if (!entry) return state
      return { ...state, pending: [entry, ...state.pending.filter(item => item.id !== entry.id)].slice(0, MAX_PENDING) }
    }
    case 'tool/result': {
      const message = data.message
      const id = message?.source?.kind === 'tool' ? message.source.callId : message?.toolCallId
      const call = state.pending.find(item => item.id === id)
      if (!call) return state
      const next = { ...state, pending: state.pending.filter(item => item !== call) }
      const failed = message?.isError === true || data.error != null
      if (call.kind === 'bash') {
        if (failed) next.failures = insertRecent(state.failures, call.key, MAX_FACTS)
        else if (state.failures.includes(call.key) && successfulBash(data)) {
          next.failures = state.failures.filter(key => key !== call.key)
        }
      } else if (!failed) {
        const paths = call.kind === 'apply_patch'
          ? (Array.isArray(data.meta?.diffs) ? data.meta.diffs.map(diff => diff?.path) : [])
          : [data.meta?.path]
        for (const path of paths) {
          if (isPath(path)) next.paths = insertRecent(next.paths, path, MAX_FACTS)
        }
      }
      return next
    }
    default:
      return state
  }
}

export const progressProjection = {
  key: 'nano-progress-report:summary',
  stateVersion: 1,
  stateSchema: { parse: parseState },
  init: (header, inherited) => ({
    inherited, cwd: digest(header.cwd ?? ''), paths: [], failures: [], pending: [],
  }),
  apply,
}
