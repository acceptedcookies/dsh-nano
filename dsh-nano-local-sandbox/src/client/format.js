/**
 * Pure projections of the dnls.control/1 fleet shapes into display text.
 * Null and zero stay distinct — an absent measurement is '—', never 0.
 */

export const DASH = '—'

export function formatBytes(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  if (value >= (1 << 30)) return `${(value / (1 << 30)).toFixed(1)} GiB`
  if (value >= (1 << 20)) return `${(value / (1 << 20)).toFixed(1)} MiB`
  return `${Math.round(value / 1024)} KiB`
}

export function formatCores(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  return `${Number(value).toFixed(3)} cores`
}

/** Verified host publication address, or null — unpublished services
 * never get a fake endpoint. */
export function serviceAddress(service) {
  if (service?.published !== true) return null
  if (typeof service.hostAddress !== 'string' || service.hostAddress === '') return null
  if (!Number.isInteger(service.hostPort)) return null
  return `${service.hostAddress}:${service.hostPort}`
}

/** `web:8787 tcp → 127.0.0.1:8080 · unknown` — detail-row services carry
 * containerPort/protocol/hostPort/hostAddress, never `name`/`ports`. */
export function serviceLine(service) {
  if (!service || typeof service.serviceId !== 'string') return null
  const head = `${service.serviceId}:${service.containerPort}${service.protocol ? ` ${service.protocol}` : ''}`
  const addr = serviceAddress(service)
  return [head, addr ? `→ ${addr}` : null, service.health ?? null].filter(Boolean).join(' ')
}

/** Row-level services only carry `{serviceId, published, health}` — join
 * ids, never render objects. */
export function serviceSummary(services) {
  if (!Array.isArray(services)) return ''
  return services
    .map((entry) => (typeof entry === 'string' ? entry : entry?.serviceId))
    .filter((id) => typeof id === 'string' && id.length > 0)
    .join(', ')
}
