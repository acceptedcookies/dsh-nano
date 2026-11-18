/** Session/profile/API family — unique author for existing 12 HTTP bindings. */

import { defineFamily } from '../../../packages/dsh-interface/src/contracts/FamilyDefinition.js'

const op = (semanticsRef, failures = ['invalid-request', 'unauthorized', 'forbidden-or-invisible', 'not-found', 'conflict', 'rate-limited', 'timeout', 'unreachable', 'no-active-profile', 'profile-not-found', 'upstream-error']) => ({
  input: { type: 'object' },
  output: { type: 'object' },
  failures,
  semanticsRef,
})

const nativeFailures = ['NATIVE_UNAVAILABLE', 'NATIVE_UNSUPPORTED', 'NATIVE_PROJECTION_FAILED', 'NATIVE_OUTCOME_UNKNOWN', 'invalid-request']

export const SESSION_FAMILY = defineFamily({
  contractId: 'dncs.session.v1',
  authorityRefs: {
    'docs/specs/dsh-nano-cloud-session/design-1119.md#R1': { approved: true },
    'docs/specs/dsh-nano-cloud-session/design-1119.md#R4': { approved: true },
    'docs/specs/dsh-nano-cloud-session/design-1119.md#R5': { approved: true },
  },
  operations: {
    'config.list': op('config/list'),
    'config.save': op('config/save', ['invalid-request']),
    'config.remove': op('config/remove', ['invalid-request', 'profile-not-found']),
    'config.activate': op('config/activate', ['invalid-request', 'profile-not-found']),
    'config.test': op('config/test'),
    'config.security': op('config/security'),
    'config.ssh-key': op('config/ssh-key'),
    'sessions.list': op('sessions/list'),
    'sessions.insights': op('sessions/insights'),
    'session.native_open': op('session/native_open', nativeFailures),
    'session.workspace_shell': op('session/workspace_shell', ['NATIVE_UNAVAILABLE', 'invalid-request']),
    'session.get': op('session/get'),
    'session.messages': op('session/messages'),
    'session.attachments': op('session/attachments'),
    'session.insights': op('session/insights'),
    'session.generate_insights': op('session/generate_insights'),
    'session.tags': op('session/tags'),
    'session.set_tags': op('session/set_tags', ['invalid-request', 'conflict', 'forbidden-or-invisible']),
    'session.append_tags': op('session/append_tags', ['invalid-request', 'conflict', 'forbidden-or-invisible']),
    'session.sleep': op('session/sleep'),
    'session.create': op('session/create'),
    'session.message': op('session/message'),
    'session.archive': op('session/archive'),
    'session.unarchive': op('session/unarchive'),
    'session.terminate': op('session/terminate'),
    'catalog.read': op('catalog/read'),
    'attachment.upload': op('attachment/upload', ['invalid-request', 'body-too-large', 'forbidden-or-invisible']),
    'ssh.info': op('ssh/info'),
  },
  bindings: {
    'http.status': {
      operationIds: ['config.list'],
      transport: 'http',
      path: '/nano-cloud-session/status',
      methods: ['POST'],
      bodyLimit: 16384,
    },
    'http.config': {
      operationIds: ['config.list', 'config.save', 'config.remove', 'config.activate', 'config.test', 'config.security', 'config.ssh-key'],
      transport: 'http',
      path: '/nano-cloud-session/config',
      methods: ['POST'],
      bodyLimit: 16384,
      dispatch: { field: 'action', cases: {
        list: 'config.list', save: 'config.save', remove: 'config.remove',
        activate: 'config.activate', test: 'config.test', security: 'config.security',
        'ssh-key': 'config.ssh-key',
      } },
    },
    'http.sessions': {
      operationIds: ['sessions.list', 'sessions.insights'],
      transport: 'http',
      path: '/nano-cloud-session/sessions',
      methods: ['POST'],
      bodyLimit: 65536,
      dispatch: { field: 'op', cases: { list: 'sessions.list', insights: 'sessions.insights' } },
    },
    'http.session': {
      operationIds: [
        'session.native_open', 'session.workspace_shell', 'session.get', 'session.messages', 'session.attachments',
        'session.insights', 'session.generate_insights', 'session.tags', 'session.set_tags',
        'session.append_tags', 'session.sleep',
      ],
      transport: 'http',
      path: '/nano-cloud-session/session',
      methods: ['POST'],
      bodyLimit: 65536,
      dispatch: { field: 'op', cases: {
        native_open: 'session.native_open', workspace_shell: 'session.workspace_shell', get: 'session.get', messages: 'session.messages',
        attachments: 'session.attachments', insights: 'session.insights',
        generate_insights: 'session.generate_insights', tags: 'session.tags',
        set_tags: 'session.set_tags', append_tags: 'session.append_tags', sleep: 'session.sleep',
      } },
    },
    'http.create': { operationIds: ['session.create'], transport: 'http', path: '/nano-cloud-session/create', methods: ['POST'], bodyLimit: 262144 },
    'http.message': { operationIds: ['session.message'], transport: 'http', path: '/nano-cloud-session/message', methods: ['POST'], bodyLimit: 65536 },
    'http.archive': { operationIds: ['session.archive'], transport: 'http', path: '/nano-cloud-session/archive', methods: ['POST'], bodyLimit: 16384 },
    'http.unarchive': { operationIds: ['session.unarchive'], transport: 'http', path: '/nano-cloud-session/unarchive', methods: ['POST'], bodyLimit: 16384 },
    'http.terminate': { operationIds: ['session.terminate'], transport: 'http', path: '/nano-cloud-session/terminate', methods: ['POST'], bodyLimit: 16384 },
    'http.catalog': { operationIds: ['catalog.read'], transport: 'http', path: '/nano-cloud-session/catalog', methods: ['POST'], bodyLimit: 16384 },
    'http.upload': { operationIds: ['attachment.upload'], transport: 'http', path: '/nano-cloud-session/upload', methods: ['POST'], bodyLimit: 33554432 },
    'http.ssh': { operationIds: ['ssh.info'], transport: 'http', path: '/nano-cloud-session/ssh', methods: ['POST'], bodyLimit: 16384 },
  },
  providers: {
    devin: {
      plugin: 'dsh-nano-cloud-session',
      supports: Object.keys({
        'http.status': 1, 'http.config': 1, 'http.sessions': 1, 'http.session': 1,
        'http.create': 1, 'http.message': 1, 'http.archive': 1, 'http.unarchive': 1,
        'http.terminate': 1, 'http.catalog': 1, 'http.upload': 1, 'http.ssh': 1,
      }).map(bindingId => ({ bindingId })),
      constraintsRef: 'dncs.devin.api',
    },
  },
})

export const EXISTING_HTTP_PATHS = Object.freeze(
  Object.values(SESSION_FAMILY.bindings).map(binding => binding.path),
)
