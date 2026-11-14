import { assertPublicSpec, BACKEND_METHODS, capabilityReport } from './backend.js'

function unimplemented(method) {
  const error = new Error(`NVX backend method ${method} is not implemented`)
  error.code = 'backend.nvx.unimplemented'
  return Promise.reject(error)
}

/** Same constructor contract as Apple. Every method except capabilities rejects. */
export function createNvxBackend(spec = {}) {
  assertPublicSpec(spec)
  const api = {
    capabilities() {
      return capabilityReport()
    },
  }
  for (const method of BACKEND_METHODS) {
    if (method === 'capabilities') continue
    api[method] = () => unimplemented(method)
  }
  return api
}
