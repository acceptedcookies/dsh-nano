/** Recipe fields that Apple inspect actually exposes, independent of liveness. */
export function inspectedRecipe(configuration = {}) {
  const image = configuration.image
  const descriptor = image?.descriptor
  const imageRef = typeof image === 'string' ? image : image?.reference ?? null
  const mounts = Array.isArray(configuration.mounts)
    ? configuration.mounts.map((mount) => ({
      source: mount.source ?? null,
      target: mount.destination ?? mount.target ?? null,
      options: mount.options ?? [],
      type: mount.type ?? null,
    }))
    : null
  return {
    imageRef,
    imageDigest: descriptor?.digest ?? null,
    mounts,
    runtimeSource: mounts?.find((mount) => mount.target === '/opt/kitesurf')?.source ?? null,
    stateSource: mounts?.find((mount) => mount.target === '/var/lib/kitesurf-state')?.source ?? null,
    // Useful inspection evidence, not drift gates: entrypoint.sh exports the GC
    // flag itself, so its absence from initProcess.environment proves nothing.
    environment: configuration.initProcess?.environment ?? null,
    labels: configuration.labels ?? null,
  }
}

/** Apple expands short Docker Hub names in configuration.image.reference. */
function canonicalImage(reference) {
  let image = String(reference).trim().replace(/^index\.docker\.io\//, 'docker.io/')
  if (!image.includes('/')) image = `docker.io/library/${image}`
  else if (!/[.:]/.test(image.split('/')[0]) && !image.startsWith('localhost/')) image = `docker.io/${image}`
  if (image.startsWith('docker.io/') && image.slice('docker.io/'.length).split('/').length === 1) {
    image = `docker.io/library/${image.slice('docker.io/'.length)}`
  }
  return image
}

/** Missing fixture fields mean unknown, not a production recipe mismatch. */
export function recipeDrift(info, { image, runtimeRoot, stateDir }) {
  const problems = []
  if (info?.imageRef && canonicalImage(info.imageRef) !== canonicalImage(image)) {
    problems.push(`image ${info.imageRef} != ${image}`)
  }
  if (info?.runtimeSource && info.runtimeSource !== runtimeRoot) {
    problems.push(`runtime ${info.runtimeSource} != ${runtimeRoot}`)
  }
  if (info?.stateSource && stateDir && info.stateSource !== stateDir) {
    problems.push(`state ${info.stateSource} != ${stateDir}`)
  }
  return problems.length ? problems.join(', ') : null
}

/** Recreate keeps the container's actual publications, falling back for fixtures. */
export function recreatePorts(info, host) {
  if (info?.ports?.length) {
    return info.ports.map((port) => ({ publish: `${port.hostAddress}:${port.hostPort}:${port.containerPort}` }))
  }
  return [
    { publish: `127.0.0.1:${host.engineHostPort}:${host.engineContainerPort}` },
    { publish: `127.0.0.1:${host.bridgeHostPort}:${host.bridgeContainerPort}` },
  ]
}
