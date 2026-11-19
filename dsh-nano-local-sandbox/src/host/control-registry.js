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
const ROW_KEYS = ['sandboxId', 'name', 'profileId', 'principal', 'recipeRef', 'origin', 'stateVolume', 'binding', 'ports']
const BINDING_KEYS = ['locator', 'generation']
const INTENT_KEYS = ['name', 'profileId', 'principal', 'recipeRef']
const OBSERVATION_KEYS = ['locator', 'generation', 'stateVolume', 'state']
const ORIGINS = new Set(['created', 'adopted'])

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

function validateStoredRow(row, rootPath, seen) {
  exactKeys(row, ROW_KEYS, 'stored sandbox row')
  for (const key of ROW_KEYS) if (row[key] === undefined) throw conflict(`stored row missing ${key}`)
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
  // Port allocations arrive with P6's validated schema; until then only `[]`.
  if (!Array.isArray(row.ports) || row.ports.length !== 0) throw conflict('stored ports must be an empty array')
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
  const seen = { sandboxId: new Set(), name: new Set(), locator: new Set(), stateVolume: new Set() }
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

  function get(sandboxId) {
    assertLive()
    const row = findRow(sandboxId)
    return row ? clone(row) : null
  }

  function list() {
    assertLive()
    return clone(rows)
  }

  /** Persist a create intent first; no backend call is made here. */
  function reserve(intent) {
    assertLive()
    const input = checkedIntent(intent)
    if (rows.some((row) => row.name === input.name)) throw nameTaken(`sandbox name already registered: ${input.name}`)
    const sandboxId = randomUUID()
    const row = {
      ...input,
      sandboxId,
      origin: 'created',
      stateVolume: join(rootPath, input.profileId, sandboxId),
      binding: { locator: `dnls-${randomUUID()}`, generation: null },
      ports: [],
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
   * Register an explicitly authorized takeover. `observation` must be a
   * verified binding: a nonempty generation and the real absolute mount
   * path. Re-adopting the same verified binding returns the same row; a
   * conflicting owner, profile or name is rejected.
   */
  function adopt(intent, observation) {
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
    if (rows.some((row) => row.name === input.name)) throw nameTaken(`sandbox name already registered: ${input.name}`)
    if (rows.some((row) => row.stateVolume === obs.stateVolume)) {
      throw conflict('another object already uses this physical state volume')
    }
    const row = {
      ...input,
      sandboxId: randomUUID(),
      origin: 'adopted',
      stateVolume: obs.stateVolume,
      binding: { locator: obs.locator, generation: obs.generation },
      ports: [],
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
    const row = findRow(sandboxId)
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

  function rename(sandboxId, name) {
    assertLive()
    if (!boundedText(name, MAX_NAME)) throw conflict('name out of bounds')
    const row = findRow(sandboxId)
    if (!row) throw conflict('unknown sandboxId')
    if (rows.some((other) => other !== row && other.name === name)) throw nameTaken(`sandbox name already registered: ${name}`)
    row.name = name
    publish()
    return clone(row)
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

  return { get, list, reserve, adopt, rename, confirm, reconcile, close }
}
