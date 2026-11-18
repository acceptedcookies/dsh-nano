/** Workspace/resource family — unique author for SSH MCP + new HTTP bindings. */

import { defineFamily } from '../../../packages/dsh-interface/src/contracts/FamilyDefinition.js'
import { decodeBase64, optionalBoolean, optionalInteger, rejectUnknown, requireString } from './codec-util.js'

export const WORKSPACE_FAILURES = Object.freeze([
  'invalid-request',
  'workspace-unavailable',
  'workspace-scope-expired',
  'workspace-denied',
  'workspace-not-found',
  'workspace-conflict',
  'workspace-limit',
  'workspace-failed',
  'workspace-outcome-unknown',
])

export const HTTP_STATUS_FOR_REASON = Object.freeze({
  'invalid-request': 422,
  'workspace-unavailable': 503,
  'workspace-scope-expired': 409,
  'workspace-denied': 403,
  'workspace-not-found': 404,
  'workspace-conflict': 409,
  'workspace-limit': 413,
  'workspace-failed': 502,
  'workspace-outcome-unknown': 502,
})

export const CONSTRAINTS = Object.freeze({
  maxFrameBytes: 1024 * 1024,
  maxFilePageBytes: 64 * 1024,
  maxInFlight: 8,
  maxProcesses: 4,
  readTimeoutMs: 20_000,
  mcpProtocol: '2025-06-18',
})

const op = (semanticsRef) => ({
  input: { type: 'object' },
  output: { type: 'object' },
  failures: WORKSPACE_FAILURES.slice(),
  semanticsRef,
})

export const RESOURCE_OPERATION_IDS = Object.freeze([
  'workspace.inspect',
  'fs.list', 'fs.stat', 'fs.read', 'fs.write', 'fs.mkdir', 'fs.rename', 'fs.remove',
  'process.start', 'process.read', 'process.wait', 'process.terminate',
])

const PATH_FIELDS = new Set(['path', 'cursor', 'limit', 'offset', 'length', 'bytes', 'expectedVersion', 'createOnly', 'from', 'to', 'overwrite', 'recursive', 'argv', 'cwd', 'envPatch', 'processHandle', 'stdoutOffset', 'stderrOffset', 'timeoutMs'])

function pathField(input) {
  const path = requireString(input.path, 'path', { min: 1, max: 4096 })
  if (path.includes('\0')) {
    const error = new Error('path must not contain NUL')
    error.reason = 'invalid-request'
    throw error
  }
  return path
}

export const RESOURCE_CODECS = Object.freeze({
  'workspace.inspect': {
    decode(input = {}) { rejectUnknown(input, new Set()); return {} },
  },
  'fs.list': {
    decode(input = {}) {
      rejectUnknown(input, new Set(['path', 'cursor', 'limit']))
      return {
        path: pathField(input),
        cursor: input.cursor === undefined ? undefined : requireString(input.cursor, 'cursor', { min: 1, max: 512 }),
        limit: optionalInteger(input.limit, 'limit', { min: 1, max: 2000 }),
      }
    },
  },
  'fs.stat': {
    decode(input = {}) {
      rejectUnknown(input, new Set(['path']))
      return { path: pathField(input) }
    },
  },
  'fs.read': {
    decode(input = {}) {
      rejectUnknown(input, new Set(['path', 'offset', 'length']))
      const length = optionalInteger(input.length, 'length', { min: 1, max: CONSTRAINTS.maxFilePageBytes }) ?? CONSTRAINTS.maxFilePageBytes
      const offset = optionalInteger(input.offset, 'offset', { min: 0 }) ?? 0
      return { path: pathField(input), offset, length }
    },
  },
  'fs.write': {
    decode(input = {}) {
      rejectUnknown(input, new Set(['path', 'bytes', 'expectedVersion', 'createOnly']))
      const bytes = decodeBase64(input.bytes, 'bytes')
      if (Math.ceil(bytes.length * 0.75) > CONSTRAINTS.maxFilePageBytes) {
        const error = new Error('write exceeds 64 KiB page')
        error.reason = 'workspace-limit'
        throw error
      }
      return {
        path: pathField(input),
        bytes,
        expectedVersion: input.expectedVersion === undefined ? undefined : requireString(input.expectedVersion, 'expectedVersion', { min: 1, max: 256 }),
        createOnly: optionalBoolean(input.createOnly, 'createOnly') === true,
      }
    },
  },
  'fs.mkdir': {
    decode(input = {}) {
      rejectUnknown(input, new Set(['path']))
      return { path: pathField(input) }
    },
  },
  'fs.rename': {
    decode(input = {}) {
      rejectUnknown(input, new Set(['from', 'to', 'expectedVersion', 'overwrite']))
      if (input.overwrite === true) {
        const error = new Error('overwrite is not supported')
        error.reason = 'invalid-request'
        throw error
      }
      return {
        from: requireString(input.from, 'from'),
        to: requireString(input.to, 'to'),
        expectedVersion: input.expectedVersion === undefined ? undefined : requireString(input.expectedVersion, 'expectedVersion', { min: 1, max: 256 }),
        overwrite: false,
      }
    },
  },
  'fs.remove': {
    decode(input = {}) {
      rejectUnknown(input, new Set(['path', 'expectedVersion', 'recursive']))
      if (input.recursive === true) {
        const error = new Error('recursive delete is not supported')
        error.reason = 'invalid-request'
        throw error
      }
      return {
        path: pathField(input),
        expectedVersion: input.expectedVersion === undefined ? undefined : requireString(input.expectedVersion, 'expectedVersion', { min: 1, max: 256 }),
        recursive: false,
      }
    },
  },
  'process.start': {
    decode(input = {}) {
      rejectUnknown(input, new Set(['argv', 'cwd', 'envPatch']))
      if (!Array.isArray(input.argv) || input.argv.length === 0) {
        const error = new Error('argv must be a non-empty array')
        error.reason = 'invalid-request'
        throw error
      }
      const argv = input.argv.map((item, i) => requireString(item, `argv[${i}]`, { min: 1, max: 4096 }))
      if (argv.some(item => item.includes('\0'))) {
        const error = new Error('argv must not contain NUL')
        error.reason = 'invalid-request'
        throw error
      }
      const envPatch = input.envPatch
      if (envPatch !== undefined) {
        if (!envPatch || typeof envPatch !== 'object' || Array.isArray(envPatch)) {
          const error = new Error('envPatch must be an object')
          error.reason = 'invalid-request'
          throw error
        }
        for (const [key, value] of Object.entries(envPatch)) {
          if (typeof key !== 'string' || typeof value !== 'string') {
            const error = new Error('envPatch values must be strings')
            error.reason = 'invalid-request'
            throw error
          }
        }
      }
      return {
        argv,
        cwd: input.cwd === undefined ? '.' : requireString(input.cwd, 'cwd'),
        envPatch,
      }
    },
  },
  'process.read': {
    decode(input = {}) {
      rejectUnknown(input, new Set(['processHandle', 'stdoutOffset', 'stderrOffset', 'limit']))
      return {
        processHandle: requireString(input.processHandle, 'processHandle', { min: 8, max: 128 }),
        stdoutOffset: optionalInteger(input.stdoutOffset, 'stdoutOffset', { min: 0 }) ?? 0,
        stderrOffset: optionalInteger(input.stderrOffset, 'stderrOffset', { min: 0 }) ?? 0,
        limit: optionalInteger(input.limit, 'limit', { min: 1, max: CONSTRAINTS.maxFilePageBytes }) ?? CONSTRAINTS.maxFilePageBytes,
      }
    },
  },
  'process.wait': {
    decode(input = {}) {
      rejectUnknown(input, new Set(['processHandle', 'timeoutMs']))
      return {
        processHandle: requireString(input.processHandle, 'processHandle', { min: 8, max: 128 }),
        timeoutMs: optionalInteger(input.timeoutMs, 'timeoutMs', { min: 0, max: 120000 }) ?? 0,
      }
    },
  },
  'process.terminate': {
    decode(input = {}) {
      rejectUnknown(input, new Set(['processHandle']))
      return { processHandle: requireString(input.processHandle, 'processHandle', { min: 8, max: 128 }) }
    },
  },
})

void PATH_FIELDS

export const WORKSPACE_FAMILY = defineFamily({
  contractId: 'dncs.workspace.v1',
  authorityRefs: {
    'docs/specs/dsh-nano-cloud-session/design-1119.md#R1': { approved: true },
    'docs/specs/dsh-nano-cloud-session/design-1119.md#R2': { approved: true },
    'docs/specs/dsh-nano-cloud-session/design-1119.md#R3': { approved: true },
    'docs/specs/dsh-nano-cloud-session/design-1119.md#R4': { approved: true },
    'docs/specs/dsh-nano-cloud-session/design-1119.md#R5': { approved: true },
  },
  operations: {
    'workspace.connect': op('workspace/connect'),
    'workspace.status': op('workspace/status'),
    'workspace.disconnect': op('workspace/disconnect'),
    'workspace.inspect': op('workspace/inspect'),
    'fs.list': op('fs/list'),
    'fs.stat': op('fs/stat'),
    'fs.read': op('fs/read'),
    'fs.write': op('fs/write'),
    'fs.mkdir': op('fs/mkdir'),
    'fs.rename': op('fs/rename'),
    'fs.remove': op('fs/remove'),
    'process.start': op('process/start'),
    'process.read': op('process/read'),
    'process.wait': op('process/wait'),
    'process.terminate': op('process/terminate'),
  },
  bindings: {
    'http.workspace': {
      operationIds: ['workspace.connect', 'workspace.status', 'workspace.disconnect', 'workspace.inspect'],
      transport: 'http',
      path: '/nano-cloud-session/workspace',
      methods: ['POST'],
      bodyLimit: 65536,
      dispatch: { field: 'op', cases: {
        connect: 'workspace.connect', status: 'workspace.status',
        disconnect: 'workspace.disconnect', inspect: 'workspace.inspect',
      } },
    },
    'http.resources': {
      operationIds: RESOURCE_OPERATION_IDS.slice(),
      transport: 'http',
      path: '/nano-cloud-session/resources',
      methods: ['POST'],
      bodyLimit: 131072,
      dispatch: { field: 'op', cases: Object.fromEntries(RESOURCE_OPERATION_IDS.map(id => [id, id])) },
    },
    'mcp.resources': {
      operationIds: RESOURCE_OPERATION_IDS.slice(),
      transport: 'mcp-stdio',
      protocol: CONSTRAINTS.mcpProtocol,
      dispatch: { field: 'name', cases: Object.fromEntries(RESOURCE_OPERATION_IDS.map(id => [id, id])) },
    },
  },
  providers: {
    devin: {
      plugin: 'dsh-nano-cloud-session',
      supports: [
        { bindingId: 'http.workspace' },
        { bindingId: 'http.resources' },
        { bindingId: 'mcp.resources' },
      ],
      constraintsRef: 'dncs.devin.ssh',
    },
  },
})

export function mcpToolsList() {
  return RESOURCE_OPERATION_IDS.map(name => ({
    name,
    description: name,
    inputSchema: { type: 'object', additionalProperties: false },
  }))
}
