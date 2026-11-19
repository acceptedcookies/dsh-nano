const ENV = /^[a-z][a-z0-9-]{0,15}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const prefix = 'dsh-resource://sandbox-terminal/'

export function terminalAddress({ envId, sandboxId, terminalId }) {
  if (![envId, sandboxId, terminalId].every(v => typeof v === 'string') ||
      !ENV.test(envId) || !UUID.test(sandboxId) || !UUID.test(terminalId)) throw new TypeError('invalid sandbox terminal reference')
  return `${prefix}${envId}/${sandboxId}/${terminalId}`
}

/** One explicit gesture owns its create promise, including an uncertain or failed result. */
export function terminalGesture({ envId, sandboxId, paneId, openId, service }, { create, canOpen, navigate }) {
  if (!ENV.test(envId) || !UUID.test(sandboxId) || !paneId || !openId) throw new TypeError('invalid create intent')
  let issued
  const issue = () => issued ??= Promise.resolve().then(async () => {
    const ref = await create({ sandboxId, paneId, openId, ...(service === undefined ? {} : { service }) })
    if (ref?.sandboxId !== sandboxId) throw new Error('sandbox reference mismatch')
    return terminalAddress({ envId, sandboxId, terminalId: ref.terminalId })
  })
  return {
    createOnly: issue,
    async open() {
      if (!issued && canOpen() !== true) return { state: 'handler-unavailable' }
      const address = await issue()
      try {
        if (canOpen() !== true || await navigate(address) === false) return { state: 'created-not-connected', address }
        return { state: 'navigation-requested', address }
      } catch { return { state: 'created-not-connected', address } }
    },
  }
}

// The supported host's sidebarRight.openTab/openResource requires a mounted Session.
// The availability result describes that dependency, not a permission to synthesize a Session.
export const managementAvailability = () => ({
  available: false, managementApi: true,
  dependency: '宿主依赖：当前 [dsh工作台] 的页签需要已挂载的 session，不能提供无 session 的沙箱页。',
})
