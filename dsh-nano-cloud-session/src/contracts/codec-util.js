/** Pure codec helpers shared by both families. No I/O, no node:*. */

export function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

export function rejectUnknown(input, allowed) {
  if (!isPlainObject(input)) {
    const error = new Error('request must be a JSON object')
    error.reason = 'invalid-request'
    throw error
  }
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      const error = new Error(`unknown field ${key}`)
      error.reason = 'invalid-request'
      throw error
    }
  }
  return input
}

export function omitUndefined(object) {
  const out = {}
  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

export function requireString(value, name, { min = 1, max = 4096 } = {}) {
  if (typeof value !== 'string') {
    const error = new Error(`${name} must be a string`)
    error.reason = 'invalid-request'
    throw error
  }
  if (value.length < min || value.length > max) {
    const error = new Error(`${name} length out of range`)
    error.reason = 'invalid-request'
    throw error
  }
  return value
}

export function optionalBoolean(value, name) {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    const error = new Error(`${name} must be a boolean`)
    error.reason = 'invalid-request'
    throw error
  }
  return value
}

export function optionalInteger(value, name, { min, max } = {}) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    const error = new Error(`${name} must be an integer`)
    error.reason = 'invalid-request'
    throw error
  }
  if (min !== undefined && value < min) {
    const error = new Error(`${name} is below ${min}`)
    error.reason = 'invalid-request'
    throw error
  }
  if (max !== undefined && value > max) {
    const error = new Error(`${name} is above ${max}`)
    error.reason = 'invalid-request'
    throw error
  }
  return value
}

export function decodeBase64(value, name) {
  if (typeof value !== 'string' || value === '') {
    const error = new Error(`${name} must be base64`)
    error.reason = 'invalid-request'
    throw error
  }
  if (value.includes('\0') || /[^A-Za-z0-9+/=]/.test(value)) {
    const error = new Error(`${name} is not valid base64`)
    error.reason = 'invalid-request'
    throw error
  }
  return value
}

export function resourceOk(data) {
  return { ok: true, data }
}

export function resourceFail(reason, message) {
  return { ok: false, reason, message: String(message ?? reason).slice(0, 300) }
}
