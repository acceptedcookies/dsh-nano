import { randomUUID } from 'node:crypto'
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

/**
 * Managed-sandbox control ledger: the only writable authority for managed
 * identity (T-O-36/37/40). One document `registry.json` per env state root,
 * one live writer per root enforced by a SQLite sidecar lock, atomic
 * temp+rename publishes, read-only reconciliation against persisted binding.
 *
 * Internal layer only: callers pass a private host state root and a trusted
 * env id; session ids, container names and ports are never lookup keys.
 */

const DOC_VERSION = 1
const REGISTRY_FILE = 'registry.json'
const LOCK_FILE = 'registry.lock'
const LOCK_SIDECARS = new Set([LOCK_FILE, `${LOCK_FILE}-journal`, `${LOCK_FILE}-wal`, `${LOCK_FILE}-shm`])
const MAX_TEXT = 256
const MAX_NAME = 128
const MAX_SEGMENT = 64
const MAX_PATH = 4096
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const KNOWN_STATES = new Set(['running', 'stopped', 'missing'])
const DOC_KEYS = ['version', 'envId', 'sandboxes']
const ROW_KEYS = ['sandboxId', 'name', 'profileId', 'principal', 'recipeRef', 'origin', 'stateVolume', 'binding', 'ports', 'managedAt', 'idleTimeoutMs', 'desiredRevision', 'appliedRevision', 'operations', 'terminals', 'removed']
const PORT_KEYS = ['serviceId', 'containerPort', 'hostPort', 'protocol', 'hostAddress']
const HOST_ADDRS = new Set(['127.0.0.1', '::1'])
const PORT_PROTOS = new Set(['tcp', 'udp'])
const REVISION_KEYS = ['revision', 'overrides']
const OVERRIDE_KEYS = ['cpus', 'memoryBytes']
const APPLIED_KEYS = ['revision', 'generation', 'recipeRef', 'imageDigest', 'verifiedAt']
const BINDING_KEYS = ['locator', 'generation']
const INTENT_KEYS = ['name', 'profileId', 'principal', 'recipeRef']
const OBSERVATION_KEYS = ['locator', 'generation', 'stateVolume', 'state']
const ORIGINS = new Set(['created', 'adopted'])
const OP_KEYS = ['operationId', 'requestId', 'principal', 'action', 'sandboxId', 'fingerprint', 'args', 'state', 'step', 'at', 'finishedAt']
const OP_STATES = new Set(['accepted', 'running', 'succeeded', 'failed', 'indeterminate', 'cancelled'])
const OP_PENDING = new Set(['accepted', 'running', 'indeterminate'])
const OP_TERMINAL = new Set(['succeeded', 'failed', 'cancelled'])
const WRITE_ACTIONS = new Set(['create', 'start', 'stop', 'restart', 'recreate', 'remove'])
const OP_FLOW = new Map([
  ['accepted', new Set(['running', 'cancelled'])],
  ['running', new Set(['succeeded', 'failed', 'indeterminate'])],
])
const TERMINAL_KEYS = ['terminalId', 'sandboxId', 'principal', 'openId', 'fingerprint', 'generation', 'state']
const TERMINAL_STATES = new Set(['pending', 'active', 'ended', 'unknown'])

function registryError(errorId, message, cause) {
  const error = new Error(message)
  error.errorId = errorId
  error.status = 409
  if (cause !== undefined) error.cause = cause
  return error
}

const conflict = (message, cause) => registryError('sandbox.state_conflict', message, cause)
const nameTaken = (message) => registryError('sandbox.name_taken', message)

function boundedText(value, max = MAX_TEXT) {
  return typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('\0')
}

/** One safe path segment: no separators, never `.`/`..`. */
function safeSegment(value) {
  return boundedText(value, MAX_SEGMENT) && !/[\\/]/.test(value) && value !== '.' && value !== '..'
}

/** Bounded non-NUL absolute path, shared by observations and stored volumes. */
function absolutePath(value) {
  return boundedText(value, MAX_PATH) && isAbsolute(value)
}

const lstatOrNull = (path) => lstatSync(path, { throwIfNoEntry: false })

/** Entry must be a real regular file; symlinks (even dangling) are not files. */
function requireRegularFile(path, what) {
  const stat = lstatOrNull(path)
  if (stat && !stat.isFile()) throw conflict(`${what} is not a regular file`)
}

function exactKeys(value, allowed, what) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw conflict(`${what} is not an object`)
  const keys = Object.keys(value)
  if (keys.length > allowed.length || !keys.every((key) => allowed.includes(key))) {
    throw conflict(`${what} carries fields outside the whitelist`)
  }
  return value
}

function checkedIntent(intent) {
  const input = exactKeys(intent, INTENT_KEYS, 'sandbox intent')
  for (const key of INTENT_KEYS) if (!boundedText(input[key])) throw conflict(`intent ${key} is required`)
  if (!boundedText(input.name, MAX_NAME)) throw conflict('intent name out of bounds')
  if (!safeSegment(input.profileId)) throw conflict('intent profileId is not one safe path segment')
  return { name: input.name, profileId: input.profileId, principal: input.principal, recipeRef: input.recipeRef }
}

function checkedObservation(observation, required, what) {
  const obs = exactKeys(observation, OBSERVATION_KEYS, what)
  for (const key of required) if (!boundedText(obs[key])) throw conflict(`${what} ${key} is required`)
  if (obs.stateVolume !== undefined && !absolutePath(obs.stateVolume)) {
    throw conflict(`${what} stateVolume is not a bounded absolute path`)
  }
  if (obs.state !== undefined && !KNOWN_STATES.has(obs.state)) throw conflict(`${what} state is not a known live/stopped/missing value`)
  return obs
}

function validateStoredOperation(operation, sandboxId, what) {
  exactKeys(operation, OP_KEYS, what)
  for (const key of OP_KEYS) if (!Object.hasOwn(operation, key)) throw conflict(`${what} missing ${key}`)
  if (!UUID_PATTERN.test(operation.operationId)) throw conflict(`${what} operationId is not a canonical UUID`)
  for (const key of ['requestId', 'principal', 'action', 'fingerprint', 'step', 'at']) {
    if (!boundedText(operation[key])) throw conflict(`${what} ${key} out of bounds`)
  }
  if (operation.args !== null && !boundedText(operation.args)) throw conflict(`${what} args out of bounds`)
  if (!WRITE_ACTIONS.has(operation.action)) throw conflict(`${what} action is not a managed write`)
  if (operation.sandboxId !== sandboxId) throw conflict(`${what} sandboxId does not match its row`)
  if (!OP_STATES.has(operation.state)) throw conflict(`${what} state is not a known operation state`)
  if (operation.finishedAt !== null && !boundedText(operation.finishedAt)) {
    throw conflict(`${what} finishedAt out of bounds`)
  }
  if (OP_TERMINAL.has(operation.state) && operation.finishedAt === null) {
    throw conflict(`${what} terminal state without finishedAt`)
  }
}

function isEpochMs(value) {
  return Number.isInteger(value) && value >= 0
}

function isRevision(value) {
  return Number.isInteger(value) && value >= 1
}

/**
 * One published port reservation — the exact tuple form only:
 * `{serviceId,containerPort,hostPort,protocol,hostAddress}` with loopback
 * addresses and tcp|udp. No ranges, no wildcards, no guest-chosen binds.
 */
function validateStoredPort(port) {
  exactKeys(port, PORT_KEYS, 'stored port')
  for (const key of PORT_KEYS) if (!Object.hasOwn(port, key)) throw conflict(`stored port missing ${key}`)
  if (!boundedText(port.serviceId)) throw conflict('stored port serviceId out of bounds')
  for (const key of ['containerPort', 'hostPort']) {
    if (!Number.isInteger(port[key]) || port[key] < 1 || port[key] > 65535) throw conflict(`stored port ${key} out of range`)
  }
  if (!PORT_PROTOS.has(port.protocol)) throw conflict('stored port protocol is not tcp|udp')
  if (!HOST_ADDRS.has(port.hostAddress)) throw conflict('stored port hostAddress is not loopback')
}

/** `{revision:<monotonic int>,overrides:{cpus?,memoryBytes?}}` or null. */
function validateStoredRevision(revision, what) {
  if (revision === null) return
  exactKeys(revision, REVISION_KEYS, what)
  for (const key of REVISION_KEYS) if (!Object.hasOwn(revision, key)) throw conflict(`${what} missing ${key}`)
  if (!isRevision(revision.revision)) throw conflict(`${what} revision is not a positive integer`)
  const overrides = revision.overrides
  if (overrides === null || typeof overrides !== 'object' || Array.isArray(overrides)) throw conflict(`${what} overrides must be an object`)
  for (const key of Object.keys(overrides)) {
    if (!OVERRIDE_KEYS.includes(key)) throw conflict(`${what} override key is not supported: ${key}`)
  }
  if (overrides.cpus !== undefined && !(Number.isFinite(overrides.cpus) && overrides.cpus > 0)) throw conflict(`${what} overrides.cpus out of range`)
  if (overrides.memoryBytes !== undefined && !(Number.isInteger(overrides.memoryBytes) && overrides.memoryBytes > 0)) throw conflict(`${what} overrides.memoryBytes out of range`)
}

/**
 * One terminal reservation record — metadata only: identity, ownership and
 * the open-request fingerprint. Never an execution payload, screen or URL.
 */
function validateStoredTerminal(terminal, sandboxId) {
  exactKeys(terminal, TERMINAL_KEYS, 'stored terminal')
  for (const key of TERMINAL_KEYS) if (!Object.hasOwn(terminal, key)) throw conflict(`stored terminal missing ${key}`)
  if (!UUID_PATTERN.test(terminal.terminalId)) throw conflict('stored terminalId is not a canonical UUID')
  if (terminal.sandboxId !== sandboxId) throw conflict('stored terminal sandboxId does not match its row')
  for (const key of ['principal', 'openId', 'fingerprint', 'generation']) {
    if (!boundedText(terminal[key])) throw conflict(`stored terminal ${key} out of bounds`)
  }
  if (!TERMINAL_STATES.has(terminal.state)) throw conflict('stored terminal state is not a known value')
}

function validateStoredRow(row, rootPath, seen) {
  if (row && !Object.hasOwn(row, 'idleTimeoutMs')) row.idleTimeoutMs = null
  if (row?.idleTimeoutMs !== null && (!Number.isSafeInteger(row?.idleTimeoutMs) || row.idleTimeoutMs < 0)) throw conflict('invalid idle timeout')
  exactKeys(row, ROW_KEYS, 'stored sandbox row')
  for (const key of ROW_KEYS) if (row[key] === undefined && key !== 'terminals') throw conflict(`stored row missing ${key}`)
  if (!UUID_PATTERN.test(row.sandboxId)) throw conflict('stored sandboxId is not a canonical UUID')
  if (!boundedText(row.name, MAX_NAME)) throw conflict('stored name out of bounds')
  if (!safeSegment(row.profileId)) throw conflict('stored profileId is not one safe path segment')
  if (!boundedText(row.principal) || !boundedText(row.recipeRef)) throw conflict('stored ownership fields out of bounds')
  if (!ORIGINS.has(row.origin)) throw conflict('stored origin is not created|adopted')
  exactKeys(row.binding, BINDING_KEYS, 'stored binding')
  for (const key of BINDING_KEYS) if (!Object.hasOwn(row.binding, key)) throw conflict(`stored binding missing ${key}`)
  if (!boundedText(row.binding.locator)) throw conflict('stored binding locator out of bounds')
  if (row.binding.generation !== null && !boundedText(row.binding.generation)) {
    throw conflict('stored binding generation out of bounds')
  }
  if (row.origin === 'adopted' && row.binding.generation === null) {
    throw conflict('stored adopted row is missing a verified generation')
  }
  if (!absolutePath(row.stateVolume)) throw conflict('stored stateVolume is not a bounded absolute path')
  if (row.origin === 'created' && row.stateVolume !== join(rootPath, row.profileId, row.sandboxId)) {
    throw conflict('stored created volume does not match its allocated path')
  }
  if (!Array.isArray(row.ports)) throw conflict('stored ports is not an array')
  const portServices = new Set()
  for (const port of row.ports) {
    validateStoredPort(port)
    if (portServices.has(port.serviceId)) throw conflict('duplicate serviceId in stored ports')
    portServices.add(port.serviceId)
    // Tombstones retain their persisted tuples but release the reservation;
    // only live rows compete for published tuples on reopen.
    const tuple = `${port.hostAddress}\n${port.hostPort}\n${port.protocol}`
    if (row.removed !== true) {
      if (seen.tuples.has(tuple)) throw conflict('duplicate published port tuple in stored registry')
      seen.tuples.add(tuple)
    }
  }
  if (!isEpochMs(row.managedAt)) throw conflict('stored managedAt is not a finite epoch-ms')
  validateStoredRevision(row.desiredRevision, 'stored desiredRevision')
  if (row.appliedRevision !== null) {
    exactKeys(row.appliedRevision, APPLIED_KEYS, 'stored appliedRevision')
    for (const key of APPLIED_KEYS) if (!Object.hasOwn(row.appliedRevision, key)) throw conflict(`stored appliedRevision missing ${key}`)
    if (!Number.isSafeInteger(row.appliedRevision.revision) || row.appliedRevision.revision < 0 ||
        row.appliedRevision.revision > (row.desiredRevision?.revision ?? 0) ||
        !/^sha256:[0-9a-f]{64}$/.test(row.appliedRevision.imageDigest) ||
        !Number.isFinite(Date.parse(row.appliedRevision.verifiedAt))) throw conflict('invalid stored appliedRevision')
    for (const key of ['generation', 'recipeRef', 'imageDigest', 'verifiedAt']) {
      if (!boundedText(row.appliedRevision[key])) throw conflict(`stored appliedRevision ${key} out of bounds`)
    }
  }
  if (row.removed !== true && row.removed !== false) throw conflict('stored removed is not a boolean')
  if (!Array.isArray(row.operations)) throw conflict('stored operations is not an array')
  for (const operation of row.operations) {
    validateStoredOperation(operation, row.sandboxId, 'stored operation')
    if (seen.operationId.has(operation.operationId)) throw conflict('duplicate operationId in stored registry')
    seen.operationId.add(operation.operationId)
    const dedupe = `${operation.principal}\n${operation.requestId}`
    if (seen.dedupe.has(dedupe)) throw conflict('duplicate (principal, requestId) in stored registry')
    seen.dedupe.add(dedupe)
  }
  // terminals is optional metadata: absent reads as an empty list.
  if (row.terminals === undefined) row.terminals = []
  if (!Array.isArray(row.terminals)) throw conflict('stored terminals is not an array')
  const terminalDedupe = new Set()
  for (const terminal of row.terminals) {
    validateStoredTerminal(terminal, row.sandboxId)
    if (seen.terminalId.has(terminal.terminalId)) throw conflict('duplicate terminalId in stored registry')
    seen.terminalId.add(terminal.terminalId)
    const key = `${terminal.principal}\n${terminal.openId}`
    if (terminalDedupe.has(key)) throw conflict('duplicate (principal, openId) in stored registry')
    terminalDedupe.add(key)
  }
  for (const [kind, value] of [
    ['sandboxId', row.sandboxId],
    ['name', row.name],
    ['locator', row.binding.locator],
    ['stateVolume', row.stateVolume],
  ]) {
    if (seen[kind].has(value)) throw conflict(`duplicate ${kind} in stored registry`)
    seen[kind].add(value)
  }
}

function parseDocument(text, rootPath, envId) {
  let doc
  try {
    doc = JSON.parse(text)
  } catch (parseError) {
    throw conflict('registry document is malformed; refusing to claim an empty ledger', parseError)
  }
  exactKeys(doc, DOC_KEYS, 'registry document')
  if (doc.version !== DOC_VERSION) throw conflict('registry document version is not supported')
  if (doc.envId !== envId) throw conflict('registry document belongs to a different env')
  if (!Array.isArray(doc.sandboxes)) throw conflict('registry sandboxes is not an array')
  const seen = { sandboxId: new Set(), name: new Set(), locator: new Set(), stateVolume: new Set(), operationId: new Set(), dedupe: new Set(), terminalId: new Set(), tuples: new Set() }
  for (const row of doc.sandboxes) validateStoredRow(row, rootPath, seen)
  return doc.sandboxes
}

/**
 * Opens (and claims) the managed ledger at `root` for `envId`.
 *
 * - `root` must be a real directory owned by the host; it is created 0700
 *   when absent. Symlinked roots, registry or lock files are rejected.
 * - `registry.lock` is a SQLite sidecar held under `BEGIN EXCLUSIVE` for the
 *   handle's lifetime; a second writer is refused and crash frees the lock.
 * - A root with prior entries but no readable registry is never claimed
 *   with an empty ledger.
 */
export function openControlRegistry({ root, envId } = {}) {
  if (!boundedText(envId)) throw conflict('a trusted envId is required')
  if (!boundedText(root, 1024) || !isAbsolute(root)) throw conflict('an absolute private state root is required')
  const rootPath = resolve(root)
  if (!lstatOrNull(rootPath)) mkdirSync(rootPath, { recursive: true, mode: 0o700 })
  const rootStat = lstatOrNull(rootPath)
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) throw conflict('state root is not a real directory')
  const lockPath = join(rootPath, LOCK_FILE)
  const registryPath = join(rootPath, REGISTRY_FILE)
  requireRegularFile(lockPath, 'registry lock')
  requireRegularFile(registryPath, 'registry document')

  let db
  try {
    db = new DatabaseSync(lockPath)
  } catch (openError) {
    throw conflict('cannot open registry lock', openError)
  }

  let rows
  let inTransaction = false
  let closed = false
  let poisoned = null
  try {
    chmodSync(lockPath, 0o600)
    // EXCLUSIVE locking is retained until the connection closes: the init
    // COMMIT/re-BEGIN below can never hand the root to a second writer.
    db.exec('PRAGMA locking_mode = EXCLUSIVE')
    db.exec('PRAGMA busy_timeout = 0')
    try {
      db.exec('BEGIN EXCLUSIVE')
    } catch (busyError) {
      throw conflict('another live writer owns this state root', busyError)
    }
    inTransaction = true
    db.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL)')
    let initialized = db.prepare("SELECT v FROM meta WHERE k = 'initialized'").get()?.v === 1
    const strayEntries = readdirSync(rootPath).filter(
      (name) => name !== REGISTRY_FILE && !LOCK_SIDECARS.has(name),
    )
    if (existsSync(registryPath)) {
      rows = parseDocument(readFileSync(registryPath, 'utf8'), rootPath, envId)
    } else {
      if (initialized || strayEntries.length > 0) {
        throw conflict('registry document is missing on a claimed root; refusing an empty ledger')
      }
      rows = []
      publish()
    }
    if (!initialized) {
      db.prepare("INSERT INTO meta (k, v) VALUES ('initialized', 1)").run()
      db.exec('COMMIT')
      inTransaction = false
      db.exec('BEGIN EXCLUSIVE')
      inTransaction = true
      initialized = true
    }
  } catch (openError) {
    try {
      if (inTransaction) db.exec('ROLLBACK')
    } catch (rollbackError) {
      void rollbackError
    }
    try {
      db.close()
    } catch (closeError) {
      void closeError
    }
    throw openError
  }

  function serialize() {
    return {
      version: DOC_VERSION,
      envId,
      sandboxes: rows.map((row) => ({
        sandboxId: row.sandboxId,
        name: row.name,
        profileId: row.profileId,
        principal: row.principal,
        recipeRef: row.recipeRef,
        origin: row.origin,
        stateVolume: row.stateVolume,
        binding: { locator: row.binding.locator, generation: row.binding.generation },
        ports: row.ports.map((port) => structuredClone(port)),
        managedAt: row.managedAt,
        idleTimeoutMs: row.idleTimeoutMs,
        desiredRevision: structuredClone(row.desiredRevision),
        appliedRevision: structuredClone(row.appliedRevision),
        operations: row.operations.map((operation) => structuredClone(operation)),
        terminals: (row.terminals ?? []).map((terminal) => structuredClone(terminal)),
        removed: row.removed,
      })),
    }
  }

  /** Atomic same-directory publish; any failure poisons the handle. */
  function publish() {
    const tempPath = join(rootPath, `${REGISTRY_FILE}.tmp.${randomUUID()}`)
    let tempFd = null
    try {
      tempFd = openSync(tempPath, 'wx', 0o600)
      writeFileSync(tempFd, JSON.stringify(serialize(), null, 2) + '\n')
      fsyncSync(tempFd)
      closeSync(tempFd)
      tempFd = null
      requireRegularFile(registryPath, 'registry document')
      renameSync(tempPath, registryPath)
      const dirFd = openSync(rootPath, 'r')
      try {
        fsyncSync(dirFd)
      } finally {
        closeSync(dirFd)
      }
    } catch (publishError) {
      if (tempFd !== null) {
        try {
          closeSync(tempFd)
        } catch (closeError) {
          void closeError
        }
      }
      try {
        unlinkSync(tempPath)
      } catch (unlinkError) {
        void unlinkError
      }
      const error = publishError?.errorId ? publishError : conflict('registry publish failed; handle is poisoned', publishError)
      poisoned = error
      throw error
    }
  }

  function assertLive() {
    if (poisoned) throw poisoned
    if (closed) throw conflict('registry handle is closed')
  }

  const clone = (value) => structuredClone(value)
  const findRow = (sandboxId) => rows.find((row) => row.sandboxId === sandboxId) ?? null
  // Removed rows are tombstones: invisible to identity lookups, but their
  // dedupe keys and operation documents are retained for authorized reads.
  const findVisible = (sandboxId) => rows.find((row) => row.sandboxId === sandboxId && row.removed !== true) ?? null

  function get(sandboxId) {
    assertLive()
    const row = findVisible(sandboxId)
    return row ? clone(row) : null
  }

  function list() {
    assertLive()
    return clone(rows.filter((row) => row.removed !== true))
  }

  function checkCapacity(profileId, limit) {
    if (limit === undefined) return
    if (!Number.isSafeInteger(limit) || limit < 1) throw conflict('invalid profile capacity')
    if (rows.filter(r => !r.removed && r.profileId === profileId).length >= limit) {
      throw registryError('sandbox.quota', 'profile capacity is fully reserved')
    }
  }

  /** Shared row construction: one shape for reserve, adopt and create intent. */
  function newRow(input, overrides) {
    const sandboxId = randomUUID()
    return {
      ...input,
      sandboxId,
      stateVolume: join(rootPath, input.profileId, sandboxId),
      ports: [],
      managedAt: Date.now(),
      idleTimeoutMs: null,
      desiredRevision: null,
      appliedRevision: null,
      operations: [],
      terminals: [],
      removed: false,
      ...overrides,
    }
  }

  /**
   * Every published tuple claimed by a live row, env-wide across profiles.
   * Tombstones keep their volume but release their reservations.
   */
  function liveTuples() {
    const claimed = new Map()
    for (const row of rows) {
      if (row.removed) continue
      for (const port of row.ports) {
        claimed.set(`${port.hostAddress}\n${port.hostPort}\n${port.protocol}`, port.serviceId)
      }
    }
    return claimed
  }

  /**
   * Allocate a full set of published tuples for the declared services inside
   * one synchronous call — before any backend dispatch. `requests` is the
   * trusted plan `[{serviceId,containerPort,protocol,hostAddress,portRange:[lo,hi]}]`;
   * each tuple picks the smallest free hostPort in its range, failing closed
   * when the range is exhausted or a live row already claims the tuple.
   */
  function allocatePorts(requests) {
    if (!Array.isArray(requests)) throw conflict('port requests is not an array')
    const claimed = liveTuples()
    const allocated = []
    const services = new Set()
    for (const request of requests) {
      const plan = exactKeys(request, ['serviceId', 'containerPort', 'protocol', 'hostAddress', 'portRange'], 'port request')
      for (const key of ['serviceId', 'containerPort', 'protocol', 'hostAddress', 'portRange']) {
        if (!Object.hasOwn(plan, key)) throw conflict(`port request missing ${key}`)
      }
      if (!boundedText(plan.serviceId)) throw conflict('port request serviceId out of bounds')
      if (!Number.isInteger(plan.containerPort) || plan.containerPort < 1 || plan.containerPort > 65535) {
        throw conflict('port request containerPort out of range')
      }
      if (!PORT_PROTOS.has(plan.protocol)) throw conflict('port request protocol is not tcp|udp')
      if (!HOST_ADDRS.has(plan.hostAddress)) throw conflict('port request hostAddress is not loopback')
      const [lo, hi] = plan.portRange
      if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 1 || hi > 65535 || lo > hi) {
        throw conflict('port request portRange out of bounds')
      }
      if (services.has(plan.serviceId)) throw conflict(`duplicate serviceId in port plan: ${plan.serviceId}`)
      services.add(plan.serviceId)
      let hostPort = null
      for (let candidate = lo; candidate <= hi; candidate += 1) {
        if (!claimed.has(`${plan.hostAddress}\n${candidate}\n${plan.protocol}`)) { hostPort = candidate; break }
      }
      if (hostPort === null) throw registryError('sandbox.port_exhausted', 'no free host port in the configured environment range')
      const tuple = { serviceId: plan.serviceId, containerPort: plan.containerPort, hostPort, protocol: plan.protocol, hostAddress: plan.hostAddress }
      claimed.set(`${plan.hostAddress}\n${hostPort}\n${plan.protocol}`, plan.serviceId)
      allocated.push(tuple)
    }
    return allocated
  }

  /** Persist a create intent first; no backend call is made here. */
  function reserve(intent) {
    assertLive()
    const input = checkedIntent(intent)
    if (rows.some((row) => row.name === input.name)) throw nameTaken(`sandbox name already registered: ${input.name}`)
    const row = newRow(input, { origin: 'created', binding: { locator: `dnls-${randomUUID()}`, generation: null } })
    rows.push(row)
    try {
      publish()
    } catch (publishError) {
      rows.splice(rows.indexOf(row), 1)
      throw publishError
    }
    return clone(row)
  }

  const findOperation = (operationId) => {
    for (const row of rows) {
      const operation = row.operations.find((entry) => entry.operationId === operationId)
      if (operation) return { row, operation }
    }
    return null
  }

  /**
   * Atomic dedupe scope for one intent. `(principal, requestId)` already on
   * the ledger — even on a tombstone — returns the original when the
   * fingerprint matches and rejects a changed argument set. A create intent
   * persists its reservation AND its accepted operation in one publish,
   * before any privileged action runs.
   */
  function accept({ principal, requestId, action, sandboxId, createIntent, fingerprint, portPlan, maxInstances, argsJson = null } = {}) {
    assertLive()
    for (const [key, value] of [['principal', principal], ['requestId', requestId], ['action', action], ['fingerprint', fingerprint]]) {
      if (!boundedText(value)) throw conflict(`accept ${key} is required`)
    }
    if (!WRITE_ACTIONS.has(action)) throw conflict(`accept action is not a managed write: ${action}`)
    for (const row of rows) {
      const prior = row.operations.find((entry) => entry.principal === principal && entry.requestId === requestId)
      if (prior) {
        if (prior.fingerprint !== fingerprint || prior.action !== action || prior.sandboxId !== (sandboxId ?? row.sandboxId)) {
          throw conflict('requestId was already spent with different arguments')
        }
        return { operation: clone(prior), isNew: false }
      }
    }
    let row
    if (action === 'create') {
      if (sandboxId !== null && sandboxId !== undefined) throw conflict('create takes no object selector')
      const input = checkedIntent(createIntent)
      checkCapacity(input.profileId, maxInstances)
      if (rows.some((entry) => entry.name === input.name)) throw nameTaken(`sandbox name already registered: ${input.name}`)
      // The port plan is trusted profile/env config, never untrusted params;
      // the whole set reserves synchronously before any backend dispatch.
      const ports = portPlan === undefined || portPlan === null ? [] : allocatePorts(portPlan)
      row = newRow(input, { origin: 'created', binding: { locator: `dnls-${randomUUID()}`, generation: null }, ports })
    } else {
      if (portPlan !== undefined && portPlan !== null) throw conflict('only create carries a port plan')
      if (createIntent !== undefined && createIntent !== null) throw conflict('only create carries an intent')
      if (typeof sandboxId !== 'string' || !UUID_PATTERN.test(sandboxId)) throw conflict('a canonical sandboxId is required')
      row = findVisible(sandboxId)
      if (!row) throw conflict('unknown sandboxId')
      if (row.operations.some((entry) => OP_PENDING.has(entry.state))) {
        throw conflict('another operation on this object is pending or indeterminate')
      }
    }
    const operation = {
      operationId: randomUUID(),
      requestId,
      principal,
      action,
      sandboxId: row.sandboxId,
      fingerprint,
      args: argsJson === null ? null : (() => { if (!boundedText(argsJson)) throw conflict('accept args out of bounds'); return argsJson })(),
      state: 'accepted',
      step: 'accepted',
      at: new Date().toISOString(),
      finishedAt: null,
    }
    row.operations.push(operation)
    const appended = !rows.includes(row)
    if (appended) rows.push(row)
    try {
      publish()
    } catch (publishError) {
      row.operations.splice(row.operations.indexOf(operation), 1)
      if (appended) rows.splice(rows.indexOf(row), 1)
      throw publishError
    }
    return { operation: clone(operation), isNew: true }
  }

  /**
   * CAS one operation. Flow is `accepted → running|cancelled` then
   * `running → succeeded|failed|indeterminate`; every update is validated
   * before any memory mutation. A successful create/recreate persists the
   * verified binding with the success mark; the tombstone is allowed only
   * on a verified remove success or a predispatch-cancelled create (which
   * frees its quota slot). There is no undo of IO already sent.
   */
  function transition(operationId, from, { state, step, binding, removed, appliedRevision } = {}) {
    assertLive()
    if (!OP_STATES.has(state)) throw conflict('transition target is not a known operation state')
    const found = findOperation(operationId)
    if (!found) throw conflict('unknown operationId')
    const { row, operation } = found
    if (operation.state !== from) {
      const error = conflict(`operation is ${operation.state}, not ${from}`)
      error.operationState = operation.state
      throw error
    }
    if (!OP_FLOW.get(from)?.has(state)) throw conflict(`illegal transition ${from} -> ${state}`)
    if (step !== undefined && !boundedText(step)) throw conflict('transition step out of bounds')
    if (binding !== undefined) {
      if (operation.action !== 'create' && operation.action !== 'recreate') {
        throw conflict('only create/recreate may rebind')
      }
      exactKeys(binding, BINDING_KEYS, 'transition binding')
      if (state !== 'succeeded' || binding.locator !== row.binding.locator || !boundedText(binding.generation)) {
        throw conflict('transition binding needs locator and generation')
      }
    }
    if (appliedRevision !== undefined) {
      exactKeys(appliedRevision, APPLIED_KEYS, 'appliedRevision')
      if (!binding || appliedRevision.generation !== binding.generation || appliedRevision.recipeRef !== row.recipeRef ||
          appliedRevision.revision !== (row.desiredRevision?.revision ?? 0) ||
          !/^sha256:[0-9a-f]{64}$/.test(appliedRevision.imageDigest) ||
          !Number.isFinite(Date.parse(appliedRevision.verifiedAt))) throw conflict('invalid applied revision proof')
    }
    if (removed === true) {
      const allowed =
        (operation.action === 'remove' && state === 'succeeded') ||
        (operation.action === 'create' && (state === 'cancelled' ||
          (state === 'failed' && ['precheck', 'image-precheck'].includes(step) && row.binding.generation === null)))
      if (!allowed) throw conflict('tombstone requires a verified remove or a predispatch cancelled create')
    }
    operation.state = state
    if (step !== undefined) operation.step = step
    if (OP_TERMINAL.has(state)) operation.finishedAt = new Date().toISOString()
    if (binding !== undefined) row.binding = { locator: binding.locator, generation: binding.generation }
    if (appliedRevision !== undefined) row.appliedRevision = clone(appliedRevision)
    if (removed === true) row.removed = true
    publish()
    return clone(operation)
  }

  /** Document read including authorized tombstone rows; null when absent. */
  function operation(sandboxId, operationId) {
    assertLive()
    const row = findRow(sandboxId)
    const entry = row?.operations.find((candidate) => candidate.operationId === operationId)
    return entry ? clone(entry) : null
  }

  /**
   * Durable terminal reservation BEFORE any spawn. The caller proves the
   * current generation; a pending lifecycle op or a mismatched generation
   * conflicts. `(principal, openId)` dedupes across all terminals of this
   * sandbox — the same stable ref comes back even after the terminal ended,
   * never a replay. The fingerprint is the caller's stable hash of the
   * approved open params; changed params on the same key reject.
   */
  function reserveTerminal(sandboxId, { principal, openId, fingerprint, generation } = {}) {
    assertLive()
    for (const [key, value] of [['principal', principal], ['openId', openId], ['fingerprint', fingerprint], ['generation', generation]]) {
      if (!boundedText(value)) throw conflict(`terminal reserve ${key} is required`)
    }
    const row = findRow(sandboxId)
    if (!row || row.removed) throw conflict('unknown sandboxId')
    if (row.binding.generation !== generation) throw conflict('terminal reserve generation does not match the bound object')
    if (row.operations.some((op) => OP_PENDING.has(op.state))) {
      throw conflict('lifecycle operation in progress on this sandbox')
    }
    const prior = row.terminals.find((terminal) => terminal.principal === principal && terminal.openId === openId)
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw conflict('terminal reserve conflicts with an existing open')
      return { isNew: false, ref: clone(prior) }
    }
    const ref = {
      terminalId: randomUUID(),
      sandboxId,
      principal,
      openId,
      fingerprint,
      generation,
      state: 'pending',
    }
    row.terminals.push(ref)
    publish()
    return { isNew: true, ref: clone(ref) }
  }

  /**
   * Report a terminal state change for the SAME id and its original
   * generation — the generation itself is immutable once reserved.
   */
  function transitionTerminal(sandboxId, terminalId, { state, generation } = {}) {
    assertLive()
    if (!TERMINAL_STATES.has(state)) throw conflict('unknown terminal state')
    const row = findRow(sandboxId)
    const terminal = row?.terminals.find((entry) => entry.terminalId === terminalId)
    if (!terminal) throw conflict('unknown terminalId')
    if (terminal.generation !== generation) throw conflict('terminal generation mismatch — refusing to report on a different object')
    terminal.state = state
    publish()
    return clone(terminal)
  }

  /** (principal, requestId) lookup across all rows incl. tombstones. */
  function dedupe(principal, requestId) {
    assertLive()
    for (const row of rows) {
      const entry = row.operations.find((candidate) => candidate.principal === principal && candidate.requestId === requestId)
      if (entry) return clone(entry)
    }
    return null
  }

  /**
   * Register an explicitly authorized takeover. `observation` must be a
   * verified binding: a nonempty generation and the real absolute mount
   * path. Re-adopting the same verified binding returns the same row; a
   * conflicting owner, profile or name is rejected.
   */
  function adopt(intent, observation, ports = [], maxInstances) {
    assertLive()
    const input = checkedIntent(intent)
    const obs = checkedObservation(observation, ['locator', 'generation', 'stateVolume'], 'adoption observation')
    const existing = rows.find((row) => row.binding.locator === obs.locator)
    if (existing) {
      if (existing.binding.generation !== obs.generation) {
        throw conflict('locator is already bound to another generation')
      }
      if (
        existing.profileId !== input.profileId ||
        existing.principal !== input.principal ||
        existing.name !== input.name ||
        existing.recipeRef !== input.recipeRef ||
        existing.stateVolume !== obs.stateVolume
      ) {
        throw conflict('adoption conflicts with the registered owner, profile, name, recipe or mount')
      }
      return clone(existing)
    }
    checkCapacity(input.profileId, maxInstances)
    if (rows.some((row) => row.name === input.name)) throw nameTaken(`sandbox name already registered: ${input.name}`)
    if (rows.some((row) => row.stateVolume === obs.stateVolume)) {
      throw conflict('another object already uses this physical state volume')
    }
    // Adoption populates the EXACT published tuples the engine reported —
    // never a recomputed plan, and never colliding with a live row.
    const claimed = liveTuples()
    const services = new Set()
    const adoptedPorts = ports.map((port) => {
      validateStoredPort(port)
      if (services.has(port.serviceId)) throw conflict('duplicate adopted service')
      services.add(port.serviceId)
      const tuple = `${port.hostAddress}\n${port.hostPort}\n${port.protocol}`
      if (claimed.has(tuple)) throw conflict(`published tuple already claimed by another object: ${port.hostPort}`)
      claimed.set(tuple, port.serviceId)
      return { serviceId: port.serviceId, containerPort: port.containerPort, hostPort: port.hostPort, protocol: port.protocol, hostAddress: port.hostAddress }
    })
    const row = {
      ...input,
      sandboxId: randomUUID(),
      origin: 'adopted',
      stateVolume: obs.stateVolume,
      binding: { locator: obs.locator, generation: obs.generation },
      ports: adoptedPorts,
      managedAt: Date.now(),
      idleTimeoutMs: null,
      desiredRevision: null,
      appliedRevision: null,
      operations: [],
      terminals: [],
      removed: false,
    }
    rows.push(row)
    try {
      publish()
    } catch (publishError) {
      rows.splice(rows.indexOf(row), 1)
      throw publishError
    }
    return clone(row)
  }

  /**
   * Bind a fresh reservation to its own locator and allocated volume. The
   * binding is immutable once confirmed; a later change needs an explicit
   * recreate through the lifecycle plane, not this ledger.
   */
  function confirm(sandboxId, observation) {
    assertLive()
    const obs = checkedObservation(observation, ['locator', 'generation', 'stateVolume'], 'confirm observation')
    const row = findVisible(sandboxId)
    if (!row) throw conflict('unknown sandboxId')
    if (row.binding.generation !== null) throw conflict('binding is already confirmed and immutable')
    if (obs.locator !== row.binding.locator || obs.stateVolume !== row.stateVolume) {
      throw conflict('confirm observation does not match the reserved locator and volume')
    }
    row.binding.generation = obs.generation
    publish()
    return clone(row)
  }

  /**
   * Read-only reconciliation. `inspect` maps a locator to a trusted
   * normalized observation `{locator,generation,stateVolume,state}`; when
   * it cannot prove the persisted locator, generation and volume exactly,
   * the result is `{state:'unknown',generation:null}` and nothing rebinds.
   */
  async function reconcile(sandboxId, inspect) {
    assertLive()
    const row = findRow(sandboxId)
    if (!row || typeof inspect !== 'function' || !row.binding.locator || !row.binding.generation) {
      return { state: 'unknown', generation: null }
    }
    let obs
    try {
      obs = await inspect(row.binding.locator)
    } catch (inspectionError) {
      void inspectionError
      return { state: 'unknown', generation: null }
    }
    // The handle may have been closed or poisoned while inspect was in
    // flight; never hand back a trusted answer on a dead ledger.
    if (closed || poisoned) return { state: 'unknown', generation: null }
    if (
      !obs ||
      obs.locator !== row.binding.locator ||
      obs.generation !== row.binding.generation ||
      obs.stateVolume !== row.stateVolume ||
      !KNOWN_STATES.has(obs.state)
    ) {
      return { state: 'unknown', generation: null }
    }
    return { state: obs.state, generation: row.binding.generation }
  }

  /**
   * Durable desired-revision save — bookkeeping only, never an action. The
   * caller must prove `expectedRevision` equals the current desired revision
   * (0 when none is set); a stale expectation or an in-flight operation
   * rejects. Overrides are validated keys only; the profile bounds check is
   * the caller's. Restoring defaults saves `{overrides:{}}` under the same
   * expectedRevision rules.
   */
  function saveRevision(sandboxId, { expectedRevision, overrides } = {}) {
    assertLive()
    const row = findVisible(sandboxId)
    if (!row) throw conflict('unknown sandboxId')
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw conflict('expectedRevision is required')
    if (row.operations.some((entry) => OP_PENDING.has(entry.state))) {
      throw conflict('lifecycle operation in progress on this sandbox')
    }
    const current = row.desiredRevision?.revision ?? 0
    if (expectedRevision !== current) {
      const error = conflict('stale expectedRevision')
      error.code = 'revision.stale'
      throw error
    }
    const request = { revision: current + 1, overrides: overrides ?? {} }
    validateStoredRevision(request, 'desiredRevision')
    row.desiredRevision = { revision: request.revision, overrides: structuredClone(request.overrides) }
    publish()
    return clone(row.desiredRevision)
  }

  function rename(sandboxId, name) {
    assertLive()
    if (!boundedText(name, MAX_NAME)) throw conflict('name out of bounds')
    const row = findVisible(sandboxId)
    if (!row) throw conflict('unknown sandboxId')
    if (rows.some((other) => other !== row && other.name === name)) throw nameTaken(`sandbox name already registered: ${name}`)
    row.name = name
    publish()
    return clone(row)
  }

  function setIdlePolicy(sandboxId, idleTimeoutMs) {
    assertLive()
    const row = findVisible(sandboxId)
    if (!row || row.operations.some(op => OP_PENDING.has(op.state))) throw conflict('object unavailable')
    if (!Number.isSafeInteger(idleTimeoutMs) || idleTimeoutMs < 0 || idleTimeoutMs > 30 * 86400000) throw conflict('idle timeout out of range')
    row.idleTimeoutMs = idleTimeoutMs
    publish()
    return { sandboxId, idleTimeoutMs }
  }

  function close() {
    if (closed) return
    closed = true
    try {
      if (inTransaction) db.exec('ROLLBACK')
    } catch (rollbackError) {
      void rollbackError
    }
    db.close()
  }

  return { get, list, reserve, adopt, rename, confirm, reconcile, accept, transition, operation, dedupe, reserveTerminal, transitionTerminal, saveRevision, setIdlePolicy, close }
}
