import { createHash } from 'node:crypto'

const LOOPBACK_ADDRS = new Set(['127.0.0.1', '::1'])
const PUB_PROTOS = new Set(['tcp', 'udp'])

const boundedText = (value, max = 256) => typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('\0')

/**
 * Strict decode of Apple `container inspect` output into neutral evidence.
 * Returns a neutral observation, `{state:'missing'}` only for the explicit
 * isMissingContainer verdict handed in by the caller, or `null` for anything
 * ambiguous — wrong locator, ≠1 entries, malformed JSON, bad creation date,
 * or an unrecognized runtime state all fail closed here.
 *
 * `configuration.id` in the raw JSON is the container NAME — the locator —
 * not an identity; generation is a stable hash of `locator + creationDate`,
 * so a same-name replacement earns a new generation.
 */
export function decodeAppleObservation(text, locator, { missing = false, stateTarget } = {}) {
  if (missing) return { locator, generation: null, stateVolume: null, state: 'missing' }
  if (typeof text !== 'string' || text.trim() === '') return null
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!Array.isArray(parsed) || parsed.length !== 1) return null
  const configuration = parsed[0]?.configuration
  if (!configuration || typeof configuration !== 'object') return null
  if (configuration.id !== locator) return null
  const created = configuration.creationDate
  const seconds =
    typeof created === 'number' ? created
      : typeof created === 'string' ? Date.parse(created) / 1000
      : NaN
  if (!Number.isFinite(seconds) || seconds <= 0) return null // epoch/default sentinel is not an identity
  const live = parsed[0]?.status?.state
  const state = live === 'running' ? 'running' : live === 'stopped' || live === 'exited' ? 'stopped' : null
  if (state === null) return null
  const mounts = actualMounts(configuration)
  if (!mounts) return null
  const stateVolume = stateVolumeOf(mounts, stateTarget)
  const network = (parsed[0]?.status?.networks ?? []).find((row) => row?.ipv4Gateway) || null
  return {
    locator: configuration.id,
    generation: createHash('sha256').update(`${configuration.id}\n${seconds}`).digest('hex').slice(0, 32),
    stateVolume,
    state,
    creationDate: seconds,
    publications: actualPublications(configuration),
    resources: actualResources(configuration),
    mounts,
    networking: network
      ? { hostGateway: network.ipv4Gateway || null, containerAddress: network.ipv4Address || null, network: network.network || null }
      : null,
    imageDigest: typeof configuration.image?.descriptor?.digest === 'string'
      && /^sha256:[0-9a-f]{64}$/.test(configuration.image.descriptor.digest)
      ? configuration.image.descriptor.digest : null,
    observedAt: new Date().toISOString(),
  }
}

/**
 * The trusted state volume is exactly one writable bind mounted at the
 * profile-declared guest target. Every mount stacked on that target counts:
 * a second mount, a readOnly bind, or a tmpfs shadowing it makes the proof
 * ambiguous — `null`, never a guess.
 */
export function stateVolumeOf(mounts, stateTarget) {
  if (!Array.isArray(mounts) || typeof stateTarget !== 'string' || !stateTarget) return null
  const at = mounts.filter((mount) => mount.target === stateTarget)
  return at.length === 1 && at[0].type === 'bind' && at[0].readOnly === false && boundedText(at[0].source)
    ? at[0].source : null
}

/**
 * Actual published tuples from inspect — the engine's own PublishPort
 * record `{hostAddress,hostPort,containerPort,proto,count}`. Ambiguous
 * (count>1), wildcard, non-loopback or unpublished entries are evidence
 * that proves nothing, so the observation fails rather than normalizes.
 */
function actualPublications(configuration) {
  const ports = configuration?.publishedPorts
  if (!Array.isArray(ports)) return null
  const out = []
  for (const port of ports) {
    if (!port || typeof port !== 'object') return null
    const containerPort = Number(port.containerPort)
    const hostPort = Number(port.hostPort)
    const protocol = String(port.proto ?? port.protocol ?? 'tcp').toLowerCase()
    const hostAddress = String(port.hostAddress ?? '')
    const count = port.count === undefined ? 1 : Number(port.count)
    if (!LOOPBACK_ADDRS.has(hostAddress) || !PUB_PROTOS.has(protocol) || count !== 1 ||
        !Number.isInteger(containerPort) || containerPort < 1 || containerPort > 65535 ||
        !Number.isInteger(hostPort) || hostPort < 1 || hostPort > 65535) return null
    out.push({ serviceId: null, containerPort, hostPort, protocol, hostAddress })
  }
  return out
}

function actualResources(configuration) {
  const resources = configuration?.resources
  if (!resources || typeof resources !== 'object') return {}
  const out = {}
  const cpus = Number(resources.cpus)
  if (Number.isFinite(cpus) && cpus > 0) out.cpus = cpus
  const memoryBytes = Number(resources.memoryInBytes ?? resources.memoryBytes)
  if (Number.isInteger(memoryBytes) && memoryBytes > 0) out.memoryBytes = memoryBytes
  return out
}

/**
 * Neutral mount decode: Apple `virtiofs` becomes `bind`, `tmpfs` stays
 * `tmpfs`; source/target/readOnly pass through. A malformed entry (no
 * target, unknown type) makes the whole mount set unproven — `null`.
 */
function actualMounts(configuration) {
  const mounts = configuration?.mounts
  if (!Array.isArray(mounts)) return []
  const out = []
  for (const mount of mounts) {
    if (!mount || typeof mount !== 'object') return null
    const rawType = typeof mount.type === 'string' ? mount.type : Object.keys(mount.type ?? {})[0]
    const type = rawType === 'tmpfs' ? 'tmpfs' : rawType === 'virtiofs' || rawType === 'bind' ? 'bind' : null
    const target = mount.destination ?? mount.target ?? null
    if (type === null || typeof target !== 'string' || !target) return null
    out.push({
      type,
      source: typeof mount.source === 'string' ? mount.source : null,
      target,
      readOnly: mount.options?.includes?.('ro') === true || mount.readOnly === true,
    })
  }
  return out
}
