// Consumer half of the dnls.control/1 sandbox-terminal resource. The address
// is a hint only: attachment happens exclusively through the verified public
// contract and the targeted inspect answer.

const CONTRACT_VERSION = 'dnls.control/1'
const CONTRACT_HEADER = 'x-dnls-contract'
const ENV_ID = '[a-z][a-z0-9-]{0,15}'
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const ADDRESS = new RegExp(`^dsh-resource://sandbox-terminal/(${ENV_ID})/(${UUID})/(${UUID})$`)

function refuse(code, message) {
  const error = new Error(message)
  error.errorId = `dnt.sandbox.${code}`
  throw error
}

/**
 * Canonical grammar only — the raw string is validated before any URL
 * normalization, so `..`, literal `/` or `\`, `%`, query, fragment, userinfo
 * and explicit ports can never reach parsing.
 * @returns {{envId: string, sandboxId: string, terminalId: string} | null}
 */
export function parseSandboxResource(address) {
  if (typeof address !== 'string') return null
  const match = ADDRESS.exec(address)
  if (!match) return null
  return { envId: match[1], sandboxId: match[2], terminalId: match[3] }
}

async function contractBody(res) {
  if (!res.ok) refuse('http', `control request failed (${res.status})`)
  if (res.headers?.get?.(CONTRACT_HEADER) !== CONTRACT_VERSION) refuse('contract', 'unknown control contract')
  const body = await res.json().catch(() => null)
  if (body?.contractVersion !== CONTRACT_VERSION) refuse('contract', 'unknown control contract')
  return body
}

/**
 * Verify the address against the same-origin public contract and the targeted
 * inspect answer, then hand the caller the mcp lane coordinates. Nothing is
 * attached or created here.
 * @param {string} address
 * @param {typeof fetch} impl
 * @param {string} origin
 */
export async function resolveSandboxResource(address, impl, origin) {
  const parsed = parseSandboxResource(address)
  if (!parsed) refuse('address', 'not a canonical sandbox-terminal resource')
  if (typeof impl !== 'function') refuse('fetch', 'a fetch implementation is required')
  const base = new URL(origin)

  const contract = await impl(new URL('/nano-local-sandbox/contract', base).href, {
    method: 'GET',
    credentials: 'same-origin',
  }).then(contractBody)
  if (!contract.capabilities?.includes('sandbox.inspect')) {
    refuse('capability', 'sandbox.inspect is not announced')
  }

  const inspectUrl = new URL('/nano-local-sandbox/inspect', base)
  inspectUrl.searchParams.set('sandboxId', parsed.sandboxId)
  const detail = await impl(inspectUrl.href, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { [CONTRACT_HEADER]: CONTRACT_VERSION },
  }).then(contractBody)
  if (detail.sandboxId !== parsed.sandboxId) refuse('object', 'inspect names a different sandbox')
  if (detail.envId !== parsed.envId) refuse('env', 'sandbox lives in a different environment')

  return {
    lane: 'mcp',
    url: new URL('/nano-local-sandbox/mcp', base).href,
    contractVersion: CONTRACT_VERSION,
    sandboxId: parsed.sandboxId,
    terminalId: parsed.terminalId,
  }
}
