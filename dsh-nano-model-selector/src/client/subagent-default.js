/** Subagent default route: one host file, no local authority. */
import { jsonOp, call } from './jsonClient.js'

const GET_OP = jsonOp({ method: 'GET', url: '/nano-model-selector/subagent-default' })
const PUT_OP = jsonOp({ method: 'PUT', url: '/nano-model-selector/subagent-default' })

/** @returns {Promise<object|null>} */
export async function fetchSubagentDefault() {
  const value = await call(GET_OP)
  return value?.policy ?? null
}

/**
 * @param {'enable'|'disable'|'reset'} action
 * @param {{provider?:string, model?:string, reasoningEffort?:string}} [route]
 */
export async function writeSubagentDefault(action, route) {
  const value = await call(PUT_OP, {
    action,
    ...(route?.provider ? { provider: route.provider, model: route.model } : {}),
    ...(route?.reasoningEffort ? { reasoningEffort: route.reasoningEffort } : {}),
  })
  return value?.policy ?? null
}
